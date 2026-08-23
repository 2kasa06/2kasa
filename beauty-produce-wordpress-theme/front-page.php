<?php
/**
 * トップページ。
 *
 * @package BeautyProduce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

$bp_hero_title = bp_option( 'bp_hero_title', "あなたらしさを、\nいちばん美しく。" );
$bp_hero_image = bp_option( 'bp_hero_image' );
$bp_hero_image = $bp_hero_image ? $bp_hero_image : bp_asset_image( 'hero-illustration.svg' );
$bp_stats      = array(
	array( (string) wp_count_posts( 'bp_service' )->publish, 'メニュー' ),
	array( (string) count( bp_get_age_pages() ), '年代別プラン' ),
	array( '10代-60代', '対応年代' ),
);
?>

<section class="bp-hero">
	<?php get_template_part( 'template-parts/shapes' ); ?>

	<div class="bp-container bp-hero__grid">
		<div class="bp-hero__body">
			<p class="section-label reveal-left"><?php echo esc_html( trim( bp_option( 'bp_brand_name', 'BEAUTY' ) . ' ' . bp_option( 'bp_brand_sub', 'PRODUCE' ) ) ); ?></p>

			<h1 class="bp-hero__title reveal-left" style="transition-delay:90ms;">
				<?php echo nl2br( esc_html( $bp_hero_title ) ); ?>
			</h1>

			<p class="section-subtitle bp-hero__lead reveal-left" style="transition-delay:180ms;">
				<?php echo esc_html( bp_option( 'bp_hero_lead' ) ); ?>
			</p>

			<div class="btn-row reveal-left" style="transition-delay:260ms;">
				<a class="btn-primary" href="<?php echo esc_url( bp_reserve_link() ); ?>">はじめての方へ</a>
				<a class="btn-outline" href="#ages">年代から選ぶ</a>
			</div>

			<dl class="bp-hero__stats reveal-left" style="transition-delay:340ms;">
				<?php foreach ( $bp_stats as $bp_stat ) : ?>
					<div>
						<dt><?php echo esc_html( $bp_stat[0] ); ?></dt>
						<dd><?php echo esc_html( $bp_stat[1] ); ?></dd>
					</div>
				<?php endforeach; ?>
			</dl>
		</div>

		<div class="bp-hero__figure reveal-right">
			<img src="<?php echo esc_url( $bp_hero_image ); ?>" alt="<?php echo esc_attr( bp_option( 'bp_tagline' ) ); ?>" width="800" height="800" />
		</div>
	</div>

	<a class="bp-scroll-cue" href="#concept" aria-label="下へスクロール">
		<span>SCROLL</span>
		<span class="animate-pulse-glow"></span>
	</a>
</section>

<section id="concept" class="bp-section bp-section--white">
	<div class="bp-container bp-concept">
		<div class="bp-concept__figure reveal-left">
			<img src="<?php echo esc_url( bp_asset_image( 'age-30s.svg' ) ); ?>" alt="カウンセリングの様子をイメージしたイラスト" loading="lazy" width="800" height="800" />
		</div>

		<div>
			<div class="bp-heading reveal">
				<p class="section-label">CONCEPT</p>
				<h2 class="section-title">診断で終わらせない。</h2>
				<p class="section-subtitle">似合う色や形がわかっても、明日の服が決まらなければ意味がありません。診断結果を、そのまま毎日の選択に使えるところまで一緒に落とし込みます。</p>
			</div>

			<div class="bp-points">
				<?php
				$bp_points = array(
					array( '理由まで伝える', 'なぜ似合うのかを言葉にして残すので、ひとりでも判断できるようになります。' ),
					array( '手持ちから始める', 'まず持っている服とコスメを見直します。買い足しは最小限です。' ),
					array( '年代に合わせる', '同じ診断結果でも、年代によって取り入れ方は変わります。' ),
				);
				foreach ( $bp_points as $bp_index => $bp_point ) :
					?>
					<div class="reveal" style="transition-delay:<?php echo (int) ( $bp_index * 90 ); ?>ms;">
						<span class="bp-rule" aria-hidden="true"></span>
						<h3><?php echo esc_html( $bp_point[0] ); ?></h3>
						<p><?php echo esc_html( $bp_point[1] ); ?></p>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</section>

<?php
get_template_part( 'template-parts/section-services' );
get_template_part( 'template-parts/section-ages' );
get_template_part( 'template-parts/section-flow' );
get_template_part( 'template-parts/section-before-after' );
get_template_part( 'template-parts/section-voice' );
get_template_part( 'template-parts/section-faq' );
get_template_part( 'template-parts/section-contact' );
get_template_part( 'template-parts/section-cta' );

get_footer();
