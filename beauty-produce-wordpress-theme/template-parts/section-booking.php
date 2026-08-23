<?php
/**
 * ご予約・お問い合わせ。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$bp_services = get_posts(
	array(
		'post_type'      => 'bp_service',
		'posts_per_page' => -1,
		'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
	)
);
?>
<section id="booking" class="bp-section bp-section--base">
	<span class="float-shape animate-float-2" style="top:0;left:0;width:20rem;height:20rem;background:var(--rose-beige);opacity:.05;transform:translate(-40%,-40%);" aria-hidden="true"></span>
	<span class="float-shape animate-float-3" style="bottom:0;right:0;width:16rem;height:16rem;background:var(--pale-pink);opacity:.05;transform:translate(30%,30%);" aria-hidden="true"></span>

	<div class="container" style="position:relative;z-index:10;">
		<div class="bp-head reveal">
			<span class="section-label">Reservation</span>
			<h2 class="section-title">ご予約・お問い合わせ</h2>
			<p class="section-subtitle">まずは無料カウンセリングから。<br />あなたの物語を、一緒に始めましょう。</p>
		</div>

		<?php bp_contact_notice(); ?>

		<form class="bp-form reveal" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
			<input type="hidden" name="action" value="bp_contact" />
			<?php wp_nonce_field( 'bp_contact', 'bp_contact_nonce' ); ?>

			<div class="bp-form__row">
				<label for="bp-name">
					<span>お名前 <span class="bp-required">*</span></span>
					<input type="text" id="bp-name" name="bp_name" required placeholder="山田 花子" />
				</label>
				<label for="bp-email">
					<span>メールアドレス <span class="bp-required">*</span></span>
					<input type="email" id="bp-email" name="bp_email" required placeholder="hanako@example.com" />
				</label>
			</div>

			<label for="bp-phone">
				<span>お電話番号</span>
				<input type="tel" id="bp-phone" name="bp_phone" placeholder="090-0000-0000" />
			</label>

			<label for="bp-service">
				<span>ご希望のサービス</span>
				<select id="bp-service" name="bp_service">
					<option value="">選択してください</option>
					<option value="無料カウンセリング">無料カウンセリング</option>
					<?php foreach ( $bp_services as $bp_service ) : ?>
						<option value="<?php echo esc_attr( get_the_title( $bp_service ) ); ?>"><?php echo esc_html( get_the_title( $bp_service ) ); ?></option>
					<?php endforeach; ?>
					<option value="その他">その他</option>
				</select>
			</label>

			<label for="bp-message">
				<span>ご相談内容・ご質問</span>
				<textarea id="bp-message" name="bp_message" rows="4" placeholder="お気軽にご相談ください..."></textarea>
			</label>

			<p class="bp-form__hp" aria-hidden="true">
				<label for="bp-website">この欄は入力しないでください</label>
				<input type="text" id="bp-website" name="bp_website" tabindex="-1" autocomplete="off" />
			</p>

			<div class="bp-form__submit">
				<button type="submit" class="btn-primary" style="padding:1rem 3rem;">
					送信する
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
				</button>
				<p class="bp-form__note">※ 無料カウンセリングは完全予約制です</p>
			</div>
		</form>
	</div>
</section>
