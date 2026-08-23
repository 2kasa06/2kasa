<?php
/**
 * お問い合わせフォーム。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_menu_options = get_posts(
	array(
		'post_type'      => 'bp_service',
		'posts_per_page' => -1,
		'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
	)
);
$bp_tel = bp_option( 'bp_tel' );
?>
<section id="contact" class="bp-section bp-section--ivory">
	<?php get_template_part( 'template-parts/shapes' ); ?>

	<div class="bp-container bp-container--narrow">
		<div class="bp-heading bp-heading--center reveal">
			<p class="section-label">CONTACT</p>
			<h2 class="section-title">ご予約・ご相談</h2>
			<p class="section-subtitle">ご希望のメニューと日程をお送りください。2営業日以内にご返信します。迷っている段階のご相談も歓迎です。</p>
		</div>

		<?php bp_contact_notice(); ?>

		<form class="card-glow bp-form bp-mt-lg reveal" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
			<input type="hidden" name="action" value="bp_contact" />
			<?php wp_nonce_field( 'bp_contact', 'bp_contact_nonce' ); ?>

			<div class="bp-form__row">
				<label for="bp-name">
					<span>お名前<span class="bp-required">＊</span></span>
					<input type="text" id="bp-name" name="bp_name" required />
				</label>
				<label for="bp-email">
					<span>メールアドレス<span class="bp-required">＊</span></span>
					<input type="email" id="bp-email" name="bp_email" required />
				</label>
			</div>

			<label for="bp-menu">
				<span>ご希望のメニュー</span>
				<select id="bp-menu" name="bp_menu">
					<option value="">選択してください</option>
					<?php foreach ( $bp_menu_options as $bp_menu_option ) : ?>
						<option value="<?php echo esc_attr( get_the_title( $bp_menu_option ) ); ?>">
							<?php echo esc_html( get_the_title( $bp_menu_option ) ); ?>
						</option>
					<?php endforeach; ?>
					<option value="まだ決めていない・相談したい">まだ決めていない・相談したい</option>
				</select>
			</label>

			<label for="bp-message">
				<span>ご相談内容</span>
				<textarea id="bp-message" name="bp_message" rows="6" placeholder="ご希望の日程や、いま気になっていることをお書きください。"></textarea>
			</label>

			<p class="bp-form__hp" aria-hidden="true">
				<label for="bp-website">この欄は入力しないでください</label>
				<input type="text" id="bp-website" name="bp_website" tabindex="-1" autocomplete="off" />
			</p>

			<button type="submit" class="btn-primary">送信する</button>

			<?php if ( $bp_tel ) : ?>
				<p class="bp-form__note">お急ぎの場合は <?php echo esc_html( $bp_tel ); ?> またはInstagramのDMへ。</p>
			<?php endif; ?>
		</form>
	</div>
</section>
